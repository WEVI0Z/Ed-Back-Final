import { ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { CreateUserDto } from "./dtos/create-user.dto";
import * as bcrypt from "bcrypt";
import { TokensService } from "src/tokens/tokens.service";
import { LoginUserDto } from "./dtos/login-user.dto";
import { Token } from "src/tokens/entities/token.entity";
import { GetTokenDto } from "src/tokens/dtos/get-token.dto";
import { GetUserDto } from "./dtos/get-user.dto";
import { GetSafeTokenDto } from "src/tokens/dtos/get-safe-token.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { StatsService } from "src/stats/stats.service";

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>,
        private tokensService: TokensService,
        @Inject(forwardRef(() => StatsService))
        private statsService: StatsService,
    ) {}

    async generateHashFromText(text): Promise<string> {
        return bcrypt.hash(text, 10);
    }

    async getAll(): Promise<User[]> {
        return this.repository.find();
    }

    async create(createUserDto: CreateUserDto): Promise<GetSafeTokenDto> {
        const user: User = this.repository.create({
            password: await this.generateHashFromText(createUserDto.password),
            login: createUserDto.login,
            email: createUserDto.email,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            middleName: createUserDto.middleName,
            isTeacher: createUserDto.isTeacher ?? false
        });

        const repoUser = await this.repository.save(user);

        const token: GetTokenDto = await this.tokensService.create(repoUser);

        const getSafeTokenDto: GetSafeTokenDto = {
            name: token.name,
            expiresAt: token.expiresAt
        } 

        return getSafeTokenDto;
    }

    async login(loginUserDto: LoginUserDto): Promise<GetSafeTokenDto> {
        const user: User = await this.repository.findOneBy({
            login: loginUserDto.login
        });

        if(!user || !(await bcrypt.compare(loginUserDto.password, user.password))) {
            throw new NotFoundException("Incorrect login or password");
        }

        const token: GetTokenDto = await this.tokensService.create(user);

        return {
            name: token.name,
            expiresAt: token.expiresAt
        }
    }

    async getByToken(tokenName: string): Promise<GetUserDto> {
        const token: GetTokenDto = await this.tokensService.getToken(tokenName);
        
        return token.user;
    }

    async getOne(id: number): Promise<User> {
        const user = await this.repository.findOneBy({id});

        if(!user) {
            throw new NotFoundException("User not found");
        }

        return user;
    }
    
    async update(updateUserDto: UpdateUserDto): Promise<User> {
        const user: User = await this.repository.preload(updateUserDto);

        if(!user) {
            throw new NotFoundException("User not found");
        }

        return this.repository.save(user);
    }
    
    async delete(id: number) {
        const user: User = await this.repository.findOneBy({id});
        
        await this.tokensService.deleteByUser(user);
        await this.statsService.deleteByUser(user);

        if(!user) {
            throw new NotFoundException("User not found");
        }

        return this.repository.delete(user);
    }
}
